'use client';

import Link from 'next/link';
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Simple Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Dollar Drop</span>
            </Link>
                   <nav className="hidden md:flex items-center space-x-8">
                     <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">
                       Browse
                     </Link>
                     <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">
                       Categories
                     </Link>
                    <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">
                      🎮 Games
                    </Link>
                    <Link href="/tournaments" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">
                      🏆 Tournaments
                    </Link>
                    <Link href="/tournament-results" className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-bold transition-colors">
                      📊 Results
                    </Link>
                    <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">
                      🔥 Hot Sell
                    </Link>
                     <Link href="/how-it-works" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">
                       How It Works
                     </Link>
                     <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">
                       💰 Buy Tokens
                     </Link>
                     <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200 dark:border-gray-700">
                       <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold">👛 Wallet</Link>
                       <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold">⚙️ Settings</Link>
                       <Link href="/analytics" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold">📊 Analytics</Link>
                       <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium">
                         Sign In
                       </Link>
                       <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                         Sign Up
                       </Link>
                       <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                         Become a Seller
                       </Link>
                     </div>
                   </nav>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-black py-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
              🎮 <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 dark:from-green-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                DOLLAR DROP
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed transition-colors">
              Win premium items for just <strong className="text-green-600 dark:text-green-400">$1</strong> through skill-based gaming! 
              Master reflex games, beat other players, and claim incredible prizes.
            </p>
            
            <div className="bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 dark:from-green-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-2xl p-6 mb-8 max-w-4xl mx-auto transition-colors">
              <p className="text-lg text-gray-800 dark:text-gray-200 font-bold transition-colors">
                🎯 <span className="text-green-600 dark:text-green-400">Revolutionary System:</span> No luck, no guessing - 
                <span className="text-blue-600 dark:text-blue-400"> pure gaming skill</span> determines winners!
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link 
                href="/listings" 
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 dark:from-green-700 dark:to-blue-700 dark:hover:from-green-600 dark:hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🏆 Browse Competitions
              </Link>
              <Link 
                href="/games" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🎮 Practice Games
              </Link>
              <Link 
                href="/how-it-works" 
                className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold py-4 px-8 rounded-2xl text-lg border-2 border-gray-200 dark:border-gray-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                📚 How It Works
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
                <EyeSlashIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">2. Mystery Game</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                Each listing has a randomly assigned skill game. No one knows which until they enter!
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 transition-colors">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium transition-colors">
                  🎲 Complete surprise
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
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200 hover:shadow-xl transition-all">
              <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PuzzlePieceIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🧠 Simon Says Reflex</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Follow rapid instructions with trick commands. "Press LEFT if RED" - but watch for "Press NOTHING if BLUE"!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-2 border-green-200 hover:shadow-xl transition-all">
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CursorArrowRaysIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Multi-Target Reaction</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Click the correct highlighted target among multiple shapes. Positions shuffle each round - stay sharp!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">Easy Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border-2 border-purple-200 hover:shadow-xl transition-all">
              <div className="bg-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PuzzlePieceIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🧠 Cognitive Reflex</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Rapid symbol matching with memory. Press SPACE if symbol matches previous - tests brain and reflexes!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-red-600 font-medium">Hard Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-8 border-2 border-yellow-200 hover:shadow-xl transition-all">
              <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <MusicalNoteIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🎵 Rhythm Reflex</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Follow irregular beat patterns that change tempo. Tap in sync with audio cues - perfect timing wins!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border-2 border-red-200 hover:shadow-xl transition-all">
              <div className="bg-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <DevicePhoneMobileIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🎮 Falling Object Catch</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Catch objects with realistic physics. They bounce and drift unpredictably - coordination is key!
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-orange-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            {/* Practice CTA Card */}
            <div className="bg-gradient-to-br from-gray-800 to-black rounded-2xl p-8 text-white hover:shadow-xl transition-all">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrophyIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">🏋️ Practice Mode</h3>
              <p className="text-gray-300 mb-4 text-sm">
                Get 3 daily practice attempts for each game. Master them all before entering real competitions!
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
              <span className="text-xl font-bold">Dollar Drop</span>
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