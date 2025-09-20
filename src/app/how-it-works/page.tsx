// Using inline header/footer to avoid component issues
import Link from 'next/link';
import { 
  CurrencyDollarIcon, 
  ClockIcon, 
  TrophyIcon, 
  UserGroupIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  FireIcon,
  PuzzlePieceIcon,
  CursorArrowRaysIcon,
  MusicalNoteIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
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
                   <nav className="flex items-center space-x-6">
                     <Link href="/listings" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Browse</Link>
                     <Link href="/categories" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">Categories</Link>
                     <Link href="/games" className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors">🎮 Games</Link>
                     <Link href="/hot-sell" className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors">🔥 Hot Sell</Link>
                     <Link href="/how-it-works" className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors">How It Works</Link>
                     <Link href="/buy-tokens" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">💰 Buy Tokens</Link>
                     <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                       <Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                       <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>
                       <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors">Sign In</Link>
                       <Link href="/auth/register" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sign Up</Link>
                       <Link href="/seller/apply" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Sell</Link>
                     </div>
                   </nav>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
            How Dollar Drop Gaming Works
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto transition-colors">
            Revolutionary skill-based gaming marketplace where talent wins incredible prizes for just $1 entry fees
          </p>
        </div>

        {/* 4-Step Process */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12 transition-colors">
            🎯 The 4-Step Gaming Process
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">1. Enter for $1-$3</h3>
              <p className="text-gray-600">
                Choose 1, 2, or 3 entries per listing. Each entry gives you one game attempt - your best score wins!
              </p>
              <div className="bg-green-50 rounded-lg p-3 mt-4">
                <p className="text-sm text-green-800 font-medium">
                  💡 Maximum risk: Only $3 per listing
                </p>
              </div>
            </div>

            <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PuzzlePieceIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">2. Game Selection</h3>
              <p className="text-gray-600">
                <strong>Regular Listings:</strong> Sellers choose their preferred game<br/>
                <strong>Cash Tournaments:</strong> Randomly assigned for fairness
              </p>
              <div className="bg-purple-50 rounded-lg p-3 mt-4">
                <p className="text-sm text-purple-800 font-medium">
                  🎯 Seller choice vs. random fairness
                </p>
              </div>
            </div>

            <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <ClockIcon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">3. Base Price & Timer</h3>
              <p className="text-gray-600">
                When base price is reached through entries, countdown timer begins! More entries = more money for seller.
              </p>
              <div className="bg-red-50 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-800 font-medium">
                  🔥 Hot Sell phase activated
                </p>
              </div>
            </div>

            <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrophyIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">4. Play Game & Win</h3>
              <p className="text-gray-600">
                When timer ends, everyone plays the assigned game simultaneously. Highest score wins the item!
              </p>
              <div className="bg-yellow-50 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800 font-medium">
                  🏆 Pure skill determines winner
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The 9 Games */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            🎮 The 9 Skill-Based Games
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🧠 Simon Says Reflex</h3>
              <p className="text-gray-600 text-sm mb-3">
                Follow rapid instructions with trick commands. "Press LEFT if RED" - but watch for "Press NOTHING if BLUE"!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <CursorArrowRaysIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🎯 Multi-Target Reaction</h3>
              <p className="text-gray-600 text-sm mb-3">
                Click the correct highlighted target among multiple shapes. Positions shuffle each round - stay sharp!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-green-600 font-medium">Easy Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🧠 Cognitive Reflex</h3>
              <p className="text-gray-600 text-sm mb-3">
                Rapid symbol matching with memory. Press SPACE if symbol matches previous - tests brain and reflexes!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-red-600 font-medium">Hard Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <MusicalNoteIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🎵 Rhythm Reflex</h3>
              <p className="text-gray-600 text-sm mb-3">
                Follow irregular beat patterns that change tempo. Tap in sync with audio cues - perfect timing wins!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <DevicePhoneMobileIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🎮 Falling Object Catch</h3>
              <p className="text-gray-600 text-sm mb-3">
                Catch objects with realistic physics. They bounce and drift unpredictably - coordination is key!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-orange-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">60s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🧩 Pattern Memory Challenge</h3>
              <p className="text-gray-600 text-sm mb-3">
                Memorize complex visual patterns with colored shapes. Progressive difficulty with larger grids!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-red-600 font-medium">Hard Difficulty</span>
                <span className="text-gray-500">75s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🌈 Color Sequence Memory</h3>
              <p className="text-gray-600 text-sm mb-3">
                Watch colors flash with unique sounds, then repeat the sequence. Multi-sensory memory challenge!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-orange-600 font-medium">Medium Difficulty</span>
                <span className="text-gray-500">90s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-teal-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🔗 Word Chain Reflex</h3>
              <p className="text-gray-600 text-sm mb-3">
                Connect words using logical rules and patterns. Tests language processing and cognitive flexibility!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-red-600 font-medium">Hard Difficulty</span>
                <span className="text-gray-500">80s rounds</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="bg-violet-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <PuzzlePieceIcon className="h-6 w-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🔢 Number Sequence Puzzle</h3>
              <p className="text-gray-600 text-sm mb-3">
                Find mathematical patterns and solve for missing numbers. Pure logical reasoning under pressure!
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-red-600 font-medium">Hard Difficulty</span>
                <span className="text-gray-500">85s rounds</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-black rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">🏋️ Practice Mode</h3>
              <p className="text-gray-300 text-sm mb-3">
                Unlimited practice attempts for all games. Master them before entering real competitions!
              </p>
              <button className="bg-white text-black font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm w-full">
                Practice Now →
              </button>
            </div>
          </div>
        </div>

        {/* Daily Limits & Rules */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            📋 Daily Gaming Limits & Rules
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Multiple Entries</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Up to <strong>3 entries per listing</strong> ($1 each)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Each entry = one game attempt</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Your <strong>highest score</strong> across all attempts counts</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Maximum $3 risk per listing</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border border-red-200">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Win Limits</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Maximum <strong>3 wins per day</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>After 3 wins, you're <strong>locked out</strong> for the day</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Prevents excessive winning by single users</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>Resets at midnight (your timezone)</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Daily Participation</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Maximum <strong>10 listings per day</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Can enter up to 3 times per listing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Maximum daily spend: <strong>$30</strong> (10 × $3)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Encourages responsible gaming</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-600 text-2xl">⚠️</span>
              <div>
                <h4 className="font-bold text-yellow-800 mb-2">Important Gaming Rules</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• All limits reset daily at midnight in your timezone</li>
                  <li>• Win limits apply regardless of prize value</li>
                  <li>• Once you reach 3 wins, you cannot participate in any more competitions that day</li>
                  <li>• Listing participation limit is separate from win limit</li>
                  <li>• These rules are automatically enforced by the platform</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-2xl">✅</span>
              <div>
                <h4 className="font-bold text-green-800 mb-2">Original & Legal Game Design</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• All 9 games are completely original creations by Dollar Drop</li>
                  <li>• No copyrighted material or trademarked game mechanics used</li>
                  <li>• Games designed specifically for skill-based competition</li>
                  <li>• Advanced bot-protection through randomization and human cognition</li>
                  <li>• Legally compliant with gaming and intellectual property laws</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example */}
        <div className="mb-16 bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            📱 Real Example: iPhone Competition
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Competition Setup</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-bold">iPhone 15 Pro - 256GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-bold">$999</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Entry Cost:</span>
                  <span className="font-bold text-green-600">$1 per person</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Game Selection:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    🎯 Seller's Choice
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">How Winner is Determined</h3>
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-blue-800 text-sm">
                    <strong>1.</strong> 999 people enter ($1 each) → Base price of $999 reached
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-green-800 text-sm">
                    <strong>2.</strong> Timer starts → More people can still enter
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-purple-800 text-sm">
                    <strong>3.</strong> Game starts: "Cognitive Reflex Game" (seller's choice)
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    <strong>4.</strong> Everyone plays simultaneously → Highest score wins iPhone!
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <p className="text-center text-gray-800">
              <strong>Winner pays only $1</strong> • <strong>Seller gets $879.80 (after 12% DropDollar fee)</strong> • 
              <strong>Everyone else loses only $1</strong>
            </p>
          </div>
        </div>

        {/* Game Selection System */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            🎯 Game Selection System
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-center mb-4">
                <PuzzlePieceIcon className="h-8 w-8 text-blue-600 mr-3" />
                <h3 className="text-xl font-bold text-blue-900">Regular Listings</h3>
              </div>
              <ul className="space-y-2 text-blue-800">
                <li>• <strong>Sellers choose their preferred game</strong></li>
                <li>• Game is displayed on the listing</li>
                <li>• Players know what game they'll play</li>
                <li>• Allows sellers to pick games they think suit their item</li>
                <li>• Creates strategic listing decisions</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-center mb-4">
                <TrophyIcon className="h-8 w-8 text-purple-600 mr-3" />
                <h3 className="text-xl font-bold text-purple-900">Cash Tournaments</h3>
              </div>
              <ul className="space-y-2 text-purple-800">
                <li>• <strong>Games are randomly assigned</strong></li>
                <li>• Ensures complete fairness</li>
                <li>• No advantage from game selection</li>
                <li>• Pure skill-based competition</li>
                <li>• Game revealed when tournament starts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Anti-Bot Protection */}
        <div className="mb-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
          <div className="text-center">
            <ShieldCheckIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              🛡️ Anti-Bot Protection
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              All games are designed with human-specific challenges that make automated play nearly impossible
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎲</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Randomization</h3>
              <p className="text-gray-600 text-sm">
                Unpredictable timing, patterns, and physics prevent scripted responses
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Memory Tests</h3>
              <p className="text-gray-600 text-sm">
                Working memory and cognitive flexibility required for success
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Human Reflexes</h3>
              <p className="text-gray-600 text-sm">
                Reaction times and adaptability that only humans can achieve
              </p>
            </div>
          </div>
        </div>

        {/* Seller Information */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            💼 For Sellers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">How Sellers Benefit</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Get full base price guaranteed when reached
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Earn additional money from extra entries
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  No risk - item only sells if base price met
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Mystery system prevents manipulation
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Seller Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">DropDollar Platform Fee:</span>
                  <span className="font-bold text-red-600">12%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listing Maintenance Fee:</span>
                  <span className="font-bold">$0.50</span>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 mt-4">
                  <p className="text-blue-800 text-sm font-medium">
                    💰 Cash Tournaments: 15% DropDollar fee
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm font-medium">
                    📅 Maintenance fee charged every 4 months to keep listing active
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium">
                    💡 Platform fee (12%) only charged when item sells
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 Dollar Drop - Revolutionary Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">Practice Games</Link>
            <Link href="/listings" className="text-gray-400 hover:text-white">Competitions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}