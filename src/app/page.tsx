'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CurrencyDollarIcon, 
  ClockIcon, 
  TrophyIcon, 
  FireIcon,
  MusicalNoteIcon,
  EyeSlashIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { ResponsiveLayout, ResponsiveGrid, ResponsiveText } from '@/components/ResponsiveLayout';
import useDeviceDetection, { getResponsiveClasses } from '@/hooks/useDeviceDetection';
import Navigation from '@/components/navigation/Navigation';
import UserStatusBanner from '@/components/navigation/UserStatusBanner';

export default function HomePage() {
  const deviceInfo = useDeviceDetection();
  const responsiveClasses = getResponsiveClasses(deviceInfo);
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 transition-colors">
      {/* User Status Banner */}
      <UserStatusBanner />
      {/* Gaming-Inspired Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black shadow-2xl border-b-2 border-green-500/30 transition-all duration-300">
        <ResponsiveLayout className="max-w-7xl mx-auto">
          <div className={`flex items-center justify-between ${deviceInfo.isMobile ? 'h-16' : 'h-20'}`}>
            {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-4 group">
              <div className="relative">
                <div className={`${deviceInfo.isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-green-600 rounded-full flex items-center justify-center overflow-hidden`}>
                  <img 
                    src="/DropCoin.png" 
                    alt="DropDollar Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className={`${deviceInfo.isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>DropDollar</span>
                <span className={`${deviceInfo.isMobile ? 'text-xs' : 'text-xs'} text-gray-400 font-medium tracking-wide`}>
                  {deviceInfo.isMobile ? 'GAMING' : 'GAMING MARKETPLACE'}
                </span>
              </div>
            </Link>

            {/* Main Navigation - Desktop Only */}
            {!deviceInfo.isMobile && (
              <nav className="hidden lg:flex items-center flex-1 justify-center mx-12">
                <div className="flex items-center space-x-2">
                  <Link href="/listings" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium">
                    Browse
                  </Link>
                  <Link href="/games" className="text-purple-300 hover:text-white px-4 py-2 rounded-lg transition-colors font-bold flex items-center space-x-2">
                    <span>🎮</span>
                    <span>Games</span>
                  </Link>
                  <Link href="/hot-sell" className="text-red-300 hover:text-white px-4 py-2 rounded-lg transition-colors font-bold flex items-center space-x-2">
                    <span>🔥</span>
                    <span>Hot Sell</span>
                  </Link>
                  <Link href="/tournaments" className="text-yellow-300 hover:text-white px-4 py-2 rounded-lg transition-colors font-bold flex items-center space-x-2">
                    <span>🏆</span>
                    <span>Tournaments</span>
                  </Link>
                  <Link href="/how-it-works" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium">
                    How It Works
                  </Link>
                </div>
              </nav>
            )}

            {/* User Actions */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm text-gray-300">Loading...</span>
                </div>
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-200 text-sm font-semibold">
                    👤 Welcome, {user.email?.split('@')[0] || 'User'}!
                  </span>
                  <Link href="/dashboard" className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                    Dashboard
                  </Link>
                  <Link href="/auth/login" className="px-3 py-2 text-gray-300 hover:text-white font-medium transition-colors duration-300">
                    Logout
                  </Link>
                </div>
              ) : (
                <>
                  <Link href="/auth/login" className={`${deviceInfo.isMobile ? 'px-2 py-1 text-sm' : 'px-4 py-2'} text-gray-300 hover:text-white font-medium transition-colors duration-300`}>
                    Sign In
                  </Link>
                  <Link href="/auth/register" className={`${deviceInfo.isMobile ? 'px-3 py-1.5 text-sm' : 'px-5 py-2.5'} bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl`}>
                    Sign Up
                  </Link>
                </>
              )}
              <Link href="/seller/apply" className={`${deviceInfo.isMobile ? 'px-3 py-1.5 text-sm' : 'px-5 py-2.5'} bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl`}>
                Sell
              </Link>
            </div>
          </div>

          {/* Mobile Navigation */}
          {deviceInfo.isMobile && (
            <div className="pb-3">
              <div className="flex flex-wrap gap-1.5 justify-center">
                <Link href="/games" className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-lg text-xs font-medium">🎮 Games</Link>
                <Link href="/tournaments" className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded-lg text-xs font-medium">🏆 Tournaments</Link>
                <Link href="/hot-sell" className="px-2 py-1 bg-red-600/20 text-red-300 rounded-lg text-xs font-medium">🔥 Hot Sell</Link>
                <Link href="/listings" className="px-2 py-1 bg-gray-600/20 text-gray-300 rounded-lg text-xs font-medium">Browse</Link>
                <Link href="/buy-tokens" className="px-2 py-1 bg-green-600/20 text-green-300 rounded-lg text-xs font-medium">💰 Tokens</Link>
              </div>
            </div>
          )}
        </ResponsiveLayout>
      </header>
      
      {/* Hero Section - Gaming Style */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-black dark:via-gray-900 dark:to-purple-900 py-24 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-green-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-black mb-4">
                <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
                  DROPDOLLAR
                </span>
              </h1>
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent flex-1"></div>
                <span className="text-2xl">🎮</span>
                <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent flex-1"></div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-green-400 mb-4 italic tracking-wide">
                "Don't drop out, drop a dollar."
              </p>
              <p className="text-lg text-gray-300 font-medium tracking-wide">
                SKILL-BASED GAMING MARKETPLACE
              </p>
            </div>
            <div className="max-w-4xl mx-auto mb-12">
              <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                Win premium items for just <span className="text-green-400 font-bold text-2xl">$1</span> through skill-based gaming! 
                Master reflex games, beat other players, and claim incredible prizes.
              </p>
              
              <div className="bg-gradient-to-r from-green-900/40 via-blue-900/40 to-purple-900/40 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-green-500/20">
                <p className="text-xl text-white font-bold">
                  🎯 <span className="text-green-400">Revolutionary System:</span> No luck, no guessing - 
                  <span className="text-blue-400"> pure gaming skill</span> determines winners!
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link 
                href="/listings" 
                className="group relative bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-5 px-10 rounded-2xl text-xl transition-all duration-300 shadow-2xl hover:shadow-green-500/25 transform hover:-translate-y-2 hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="text-2xl">🏆</span>
                  <span>Browse Competitions</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>
              <Link 
                href="/games" 
                className="group relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-5 px-10 rounded-2xl text-xl transition-all duration-300 shadow-2xl hover:shadow-purple-500/25 transform hover:-translate-y-2 hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="text-2xl">🎮</span>
                  <span>Practice Games</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>
              <Link 
                href="/how-it-works" 
                className="group relative bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-5 px-10 rounded-2xl text-xl transition-all duration-300 shadow-2xl hover:shadow-gray-500/25 transform hover:-translate-y-2 hover:scale-105 border-2 border-gray-500/30"
              >
                <span className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="text-2xl">📚</span>
                  <span>How It Works</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500 to-gray-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>
            </div>

            {/* Live Stats */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 max-w-5xl mx-auto shadow-xl border border-gray-200 dark:border-gray-700 transition-colors">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">$1</div>
                  <div className="text-gray-600 dark:text-gray-300">Entry Cost</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">5</div>
                  <div className="text-gray-600 dark:text-gray-300">Skill Games</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">47</div>
                  <div className="text-gray-600 dark:text-gray-300">Live Competitions</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">15,247</div>
                  <div className="text-gray-600 dark:text-gray-300">Gaming Winners</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Gaming Version */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
              🎯 Win Through Gaming Skill
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors">
              Our revolutionary system rewards the most skilled gamers with incredible prizes for just $1 entry fees
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">1. Enter for $1</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                One entry per person at $1 each. Fair competition - no multiple entries allowed.
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 transition-colors">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium transition-colors">
                  💡 Maximum risk: $1
                </p>
              </div>
            </div>

            <div className="text-center bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                <PuzzlePieceIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">2. Choose Your Game</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                Each listing clearly shows which skill game you'll play. Pick your favorite or challenge yourself!
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 transition-colors">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium transition-colors">
                  🎯 Transparent selection
                </p>
              </div>
            </div>

            <div className="text-center bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                <ClockIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">3. Timer Starts</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                When base price is reached, countdown begins! More entries during timer = more money for seller.
              </p>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 transition-colors">
                <p className="text-sm text-purple-800 dark:text-purple-300 font-medium transition-colors">
                  🔥 Hot Sell phase
                </p>
              </div>
            </div>

            <div className="text-center bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                <TrophyIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">4. Game & Win</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                When timer ends, everyone plays the same game. Highest score wins the item!
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 transition-colors">
                <p className="text-sm text-orange-800 dark:text-orange-300 font-medium transition-colors">
                  🏆 Pure skill wins
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 5 Games Preview */}
      <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
              🎮 Master 3 Skill-Based Games
            </h2>
            <p className="text-xl text-gray-600">
              Sellers choose which game to use for their competitions - practice them all to maximize your winning chances
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Multi-Target Reaction */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-8 border-2 border-green-200 dark:border-green-700 hover:shadow-xl transition-all">
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CursorArrowRaysIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">🎯 Multi-Target Reaction</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm transition-colors">
                Click all highlighted targets as quickly as possible. Speed and accuracy determine your score with decimal precision.
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium transition-colors">Medium Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400 transition-colors">Timed rounds</span>
              </div>
            </div>

            {/* Falling Object Catch */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl p-8 border-2 border-red-200 dark:border-red-700 hover:shadow-xl transition-all">
              <div className="bg-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <DevicePhoneMobileIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">💰 Falling Object Catch</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm transition-colors">
                Catch coins and dollars with your cash case using realistic physics. Objects bounce and drift unpredictably!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-red-600 dark:text-red-400 font-medium transition-colors">Medium Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400 transition-colors">Timed rounds</span>
              </div>
            </div>

            {/* Color Sequence Memory */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-8 border-2 border-purple-200 dark:border-purple-700 hover:shadow-xl transition-all">
              <div className="bg-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PuzzlePieceIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">🌈 Color Sequence Memory</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm transition-colors">
                Watch colors flash with unique sounds, then repeat the sequence. Speed-based scoring with audio cues!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 dark:text-purple-400 font-medium transition-colors">Hard Difficulty</span>
                <span className="text-gray-500 dark:text-gray-400 transition-colors">Progressive rounds</span>
              </div>
            </div>

            {/* Practice CTA Card */}
            <div className="bg-gradient-to-br from-gray-800 to-black rounded-2xl p-8 text-white hover:shadow-xl transition-all md:col-span-2 lg:col-span-1">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrophyIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">🏋️ Practice Mode</h3>
              <p className="text-gray-300 mb-4 text-sm">
                Get unlimited practice attempts for each game. Master them all before entering real competitions!
              </p>
              <Link 
                href="/games"
                className="inline-block bg-white text-black font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Practice Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Hot Sell Teaser */}
      <section className="py-20 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <div className="flex items-center justify-center mb-6">
              <FireIcon className="h-12 w-12 mr-4 animate-bounce" />
              <h2 className="text-4xl md:text-5xl font-bold">
                🔥 LIVE GAMING COMPETITIONS
              </h2>
              <FireIcon className="h-12 w-12 ml-4 animate-bounce" />
            </div>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              <strong>24 competitions</strong> with active countdown timers! 
              Base prices reached - games starting soon!
            </p>
            <Link 
              href="/hot-sell" 
              className="bg-white text-orange-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-block"
            >
              🚨 Join Live Competitions
            </Link>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">$</span>
              </div>
              <span className="text-xl font-bold">DropDollar</span>
            </div>
            <p className="text-gray-400 mb-4">
              Revolutionary skill-based gaming marketplace. Win incredible prizes through gaming talent!
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
              <Link href="/testimonials" className="text-gray-400 hover:text-white">Success Stories</Link>
              <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}